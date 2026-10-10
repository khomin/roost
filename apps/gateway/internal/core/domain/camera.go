package domain

import (
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

type Camera struct {
	ID         string
	Name       string
	SourcePath string
	Type       CameraType
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
		Name: c.Name,
		Type: visionv1.CameraType(c.Type),
		Id:   c.ID,
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

type CameraStartResult struct {
	ShmName    string
	SlotCount  uint32
	SlotSize   uint32
	HeaderSize uint32
}
