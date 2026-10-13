package domain

import (
	"context"
	"fmt"
	roostv1 "roost/gen/v1/roost"
	visionv1 "roost/gen/v1/vision"
	"time"

	"github.com/google/uuid"
)

type CameraType int

const (
	CameraTypeUnspecified = iota
	CameraTypeIP
	CameraTypeUSB
)

// CameraMode says when the camera pipeline runs.
type CameraMode int

const (
	CameraModeUnspecified CameraMode = iota
	CameraModeAlwaysOn               // runs 24/7
	CameraModeOnDemand               // runs only while someone is watching
)

type Camera struct {
	ID         string
	Name       string
	SourcePath string
	Type       CameraType
	Mode       CameraMode
	Paused     bool // never started, whatever the mode
	UpdatedAt  time.Time
}

type CameraWithState struct {
	Camera
	State CameraState
	Err   error
}

type CameraState int

const (
	StateStopped CameraState = iota
	StateStarting
	StateRunning
	StateFailed
)

func (s CameraState) String() string {
	switch s {
	case StateStopped:
		return "stopped"
	case StateStarting:
		return "starting"
	case StateRunning:
		return "running"
	case StateFailed:
		return "failed"
	default:
		return fmt.Sprintf("CameraState(%d)", int(s))
	}
}

func (s CameraState) IsTerminal() bool {
	return s == StateStopped || s == StateFailed
}

func (s CameraState) IsActive() bool {
	return s == StateStarting || s == StateRunning
}

func (c *Camera) ToGrpc() *roostv1.Camera {
	return &roostv1.Camera{
		Name:        c.Name,
		Type:        c.Type.ToGrpc(),
		Id:          c.ID,
		IsOnline:    false,
		IsRecording: false,
		Width:       0,
		Height:      0,
		Fps:         0,
		Source:      c.SourcePath,
		Mode:        c.Mode.ToGrpc(),
		Paused:      c.Paused,
	}
}

func (c *CameraWithState) ToGrpc() *roostv1.Camera {
	return &roostv1.Camera{
		Name:        c.Name,
		Type:        c.Type.ToGrpc(),
		Id:          c.ID,
		IsOnline:    c.State == StateRunning,
		IsRecording: false,
		Width:       0,
		Height:      0,
		Fps:         0,
		Source:      c.SourcePath,
		Mode:        c.Mode.ToGrpc(),
		Paused:      c.Paused,
	}
}

func (c *Camera) UUID() uuid.UUID {
	id, err := uuid.Parse(c.ID)
	if err != nil {
		return uuid.UUID{}
	}
	return id
}

func (v CameraType) String() string {
	switch v {
	case CameraTypeUnspecified:
		return "unspecified"
	case CameraTypeIP:
		return "ip"
	case CameraTypeUSB:
		return "usb"
	}
	return "undefined"
}

func (v CameraType) ToGrpc() visionv1.CameraType {
	switch v {
	case CameraTypeUnspecified:
		return visionv1.CameraType_CAMERA_TYPE_UNSPECIFIED
	case CameraTypeIP:
		return visionv1.CameraType_CAMERA_TYPE_RTSP
	case CameraTypeUSB:
		return visionv1.CameraType_CAMERA_TYPE_USB
	}
	return visionv1.CameraType_CAMERA_TYPE_UNSPECIFIED
}

func FromGrpc(v visionv1.CameraType) CameraType {
	switch v {
	case visionv1.CameraType_CAMERA_TYPE_UNSPECIFIED:
		return CameraTypeUnspecified
	case visionv1.CameraType_CAMERA_TYPE_RTSP:
		return CameraTypeIP
	case visionv1.CameraType_CAMERA_TYPE_USB:
		return CameraTypeUSB
	}
	return CameraTypeUnspecified
}

func CameraTypeFromString(v string) CameraType {
	switch v {
	case "unspecified":
		return CameraTypeUnspecified
	case "ip":
		return CameraTypeIP
	case "usb":
		return CameraTypeUSB
	}
	return CameraTypeUnspecified
}

func (m CameraMode) String() string {
	switch m {
	case CameraModeAlwaysOn:
		return "always_on"
	case CameraModeOnDemand:
		return "on_demand"
	}
	return "unspecified"
}

func (m CameraMode) ToGrpc() roostv1.CameraMode {
	switch m {
	case CameraModeAlwaysOn:
		return roostv1.CameraMode_CAMERA_MODE_ALWAYS_ON
	case CameraModeOnDemand:
		return roostv1.CameraMode_CAMERA_MODE_ON_DEMAND
	}
	return roostv1.CameraMode_CAMERA_MODE_UNSPECIFIED
}

func CameraModeFromGrpc(m roostv1.CameraMode) CameraMode {
	switch m {
	case roostv1.CameraMode_CAMERA_MODE_ALWAYS_ON:
		return CameraModeAlwaysOn
	case roostv1.CameraMode_CAMERA_MODE_ON_DEMAND:
		return CameraModeOnDemand
	}
	return CameraModeUnspecified
}

func CameraModeFromString(v string) CameraMode {
	switch v {
	case "always_on":
		return CameraModeAlwaysOn
	case "on_demand":
		return CameraModeOnDemand
	}
	return CameraModeUnspecified
}

type CameraStartResult struct {
	ShmName    string
	SlotCount  uint32
	SlotSize   uint32
	HeaderSize uint32
	// Ctx is cancelled when the vision stream for this camera ends.
	Ctx    context.Context
	Cancel context.CancelFunc
}
