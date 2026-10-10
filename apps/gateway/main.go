package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"os"
	"roost/bootstrap"
	roostv1 "roost/gen/v1/roost"
	userv1 "roost/gen/v1/user"
	visionv1 "roost/gen/v1/vision"
	"roost/internal/api/handlers"
	"roost/internal/api/middleware"
	"roost/internal/core"
	"roost/internal/db"
	"roost/internal/db/repositories"
	"roost/internal/docs"
	"roost/internal/metrics"
	"strings"

	"net/http"
	_ "net/http/pprof"

	grpc_prometheus "github.com/grpc-ecosystem/go-grpc-prometheus"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/reflection"
	"google.golang.org/protobuf/encoding/protojson"
)

// TODO:
// 	1. Go Gateway Starts
//     ├── Connects to PostgreSQL & runs database migrations
//     ├── Connects to MinIO/S3 bucket & ensures bucket existence
//     └── Fetches active camera configurations from DB

//  2. Go Gateway Establishes C++ gRPC Connection
//     ├── Retries connection until C++ Vision Service gRPC server is ready
//     └── Calls SyncCameras(stream CameraConfig) or StartCameraStream() RPC

//  3. C++ Vision Service Configures Pipelines
//     ├── Receives stream parameters (ID, type, RTSP URL / device path)
//     ├── Spawns GStreamer/FFmpeg capture pipelines & shared memory buffers
//     └── Begins continuous motion evaluation on incoming frames

// TODO: foundation react
// TODO: vision module

// TODO: domain name
// TODO: camera tests
// TODO: alert?

func main() {
	log := slog.With("main")
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	g, ctx := errgroup.WithContext(ctx)

	app := bootstrap.App()
	db, err := db.NewDatabase(app.Cfg.DSN())
	if err != nil {
		log.Error("failed to connect to Postgres", "err", err)
	}
	defer db.Close()

	// redisClient := cache.NewRedisClient(
	// 	app.Cfg.Redis.Addr,
	// 	app.Cfg.Redis.Password,
	// 	app.Cfg.Redis.DB,
	// )

	cameraRepo := repositories.NewCameraRepository(db)
	userRepo := repositories.NewUserRepo(db)

	cameraTasks := core.NewCameraTasks()

	verifier, err := middleware.NewTokenVerifier(ctx, app.Cfg.Authorization.IssuerURL, app.Cfg.Authorization.ClientID)
	if err != nil {
		log.Error("failed to create jwt verifier", "err", err)
		os.Exit(1)
	}
	verifierDemo := middleware.NewDemoTokenVerifier(verifier)

	gwmux := runtime.NewServeMux(
		runtime.WithMarshalerOption(runtime.MIMEWildcard, &runtime.JSONPb{
			MarshalOptions: protojson.MarshalOptions{
				UseProtoNames:     true,
				EmitUnpopulated:   true,
				EmitDefaultValues: true,
			},
			UnmarshalOptions: protojson.UnmarshalOptions{
				DiscardUnknown: true,
			},
		}),
	)

	httpAddr := fmt.Sprintf(":%d", app.Cfg.Server.PortHTTP)
	grpcAddr := fmt.Sprintf(":%d", app.Cfg.Server.PortGRPC)

	grpcServer := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpc_prometheus.UnaryServerInterceptor,
			middleware.UnaryAuthInterceptor(verifierDemo),
		),
		grpc.ChainStreamInterceptor(
			grpc_prometheus.StreamServerInterceptor,
			middleware.StreamAuthInterceptor(verifierDemo),
		),
	)
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	reflection.Register(grpcServer)

	conn, err := grpc.NewClient(app.Cfg.Vision.GrpcUri, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		slog.Error("failed to create client", "err", err)
	}

	streamHub := core.NewStreamHub()
	visionClient := visionv1.NewVisionServiceClient(conn)

	cameraService := core.NewCameraService(core.CameraDeps{
		CameraRepo:   cameraRepo,
		UserRepo:     userRepo,
		Tasks:        cameraTasks,
		VisionClient: visionClient,
		Hub:          streamHub,
	})
	go cameraService.Start(ctx)

	roosterService := handlers.NewRoostService(cameraService, streamHub)
	userService := handlers.NewUserHandler(userRepo)

	roostv1.RegisterRoostServiceServer(grpcServer, roosterService)
	userv1.RegisterUserServiceServer(grpcServer, userService)

	if err := roostv1.RegisterRoostServiceHandlerFromEndpoint(ctx, gwmux, grpcAddr, opts); err != nil {
		slog.Error("failed to register endpoint", "err", err)
	}
	if err := userv1.RegisterUserServiceHandlerFromEndpoint(ctx, gwmux, grpcAddr, opts); err != nil {
		slog.Error("failed to register endpoint", "err", err)
	}

	// go func() {
	// 	c, err := ipc.NewConsumer("/roost_cam-1")
	// 	if err != nil {
	// 		log.Error("err", "err", err)
	// 	}
	// 	defer c.Close()

	// 	var count int
	// 	start := time.Now()

	// 	for {
	// 		frame, hdr, err := c.ReadFrame()
	// 		if err != nil {
	// 			log.Error("err", "err", err)
	// 		}
	// 		count++
	// 		if count%30 == 0 || hdr.Flags&1 == 1 {
	// 			fps := float64(count) / time.Since(start).Seconds()
	// 			fmt.Printf("frames=%d fps=%.1f size=%d keyframe=%v\n",
	// 				count, fps, len(frame), hdr.Flags&1 == 1)
	// 		}
	// 	}
	// }()

	httpHandler := setupHttpHandler(gwmux)

	runHttp(g, "http", httpAddr, httpHandler)
	runGrpc(g, "grpc", grpcAddr, grpcServer)
	metrics.Register(grpcServer, db.Pool)

	if strings.Contains(app.Cfg.Server.Environment, "dev") {
		go func() {
			if err := http.ListenAndServe("localhost:6060", http.DefaultServeMux); err != nil {
				log.Error("failed to listen", "err", err)
			}
		}()
	}

	<-ctx.Done()
	log.Info("shutdown signal received, shutting down...")

	if err := g.Wait(); err != nil {
		log.Error("stopped", "err", err)
	} else {
		log.Info("stopped cleanly")
	}
	log.Info("server shutdown complete")
}

func runHttp(g *errgroup.Group, name string, addr string, handler http.Handler) {
	g.Go(func() error {
		srv := &http.Server{
			Addr:    addr,
			Handler: handler,
		}
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("server failed: %w %s", err, name)
		}
		return nil
	})
}

func runGrpc(g *errgroup.Group, name string, addr string, grpcServer *grpc.Server) {
	g.Go(func() error {
		listen, err := net.Listen("tcp", addr)
		if err != nil {
			return fmt.Errorf("failed to listen on gRPC: %s %w %s", addr, err, name)
		}
		if err := grpcServer.Serve(listen); err != nil {
			return fmt.Errorf("gRPC server failed: %w %s", err, name)
		}
		return nil
	})
}

func setupHttpHandler(gwmux *runtime.ServeMux) http.Handler {
	mux := http.NewServeMux()

	mux.Handle("/", gwmux)
	mux.Handle("/docs/", http.StripPrefix("/docs", docs.Handler()))

	return corsMiddleware(mux)
}

func corsMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		h.ServeHTTP(w, r)
	})
}
