package domain

import (
	roostv1 "roost/gen/v1/roost"
	"time"
)

type CameraType int

const (
	CameraTypeUnspecified = iota
	CameraTypeIP
	CameraTypeUSB
)

type Camera struct {
	ID        string
	Name      string
	Type      CameraType
	UpdatedAt time.Time
}

func (c *Camera) ToGrpc() *roostv1.Camera {
	return &roostv1.Camera{
		Name: c.Name,
		Type: roostv1.CameraType(c.Type),
		Id:   c.ID,
	}
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
