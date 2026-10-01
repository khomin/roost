package metrics

import (
	"log/slog"
	"net/http"

	grpc_prometheus "github.com/grpc-ecosystem/go-grpc-prometheus"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
)

var (
	BlockchainRequests = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "blockchain_requests_total",
			Help: "Total number of requests to blockchain providers.",
		},
		[]string{"chain", "method", "status"},
	)
	BlockchainRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name: "blockchain_request_duration_seconds",
			Help: "Duration of requests to blockchain providers.",
		},
		[]string{"chain", "method"},
	)
)

func Register(grpcServer *grpc.Server, dbPool *pgxpool.Pool) {
	grpc_prometheus.EnableHandlingTimeHistogram()
	grpc_prometheus.Register(grpcServer)

	prometheus.MustRegister(
		BlockchainRequests,
		BlockchainRequestDuration,
	)
	if dbPool != nil {
		prometheus.MustRegister(prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name: "pgx_pool_total_conns",
				Help: "Total connections in PostgreSQL pool",
			},
			func() float64 { return float64(dbPool.Stat().TotalConns()) },
		))
		prometheus.MustRegister(prometheus.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name: "pgx_pool_acquired_conns",
				Help: "Currently acquired/in-use DB connections",
			},
			func() float64 { return float64(dbPool.Stat().AcquiredConns()) },
		))
	}
	go func() {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.Handler())
		slog.Info("Metrics HTTP exporter listening", "port", 9092)
		if err := http.ListenAndServe(":9092", mux); err != nil {
			slog.Error("Metrics HTTP server failed", "error", err)
		}
	}()
}
