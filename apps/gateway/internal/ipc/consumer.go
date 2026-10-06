package ipc

import (
	"fmt"
	"sync/atomic"
	"syscall"
	"unsafe"
)

const (
	SlotCount  = 16
	SlotSize   = 4 * 1024 * 1024
	HeaderSize = 16 // sizeof(FrameHeader): 8 + 4 + 4
)

type FrameHeader struct {
	TimestampNs uint64
	Size        uint32
	Flags       uint32
}

type Consumer struct {
	data  []byte
	head  *uint64
	tail  *uint64
	slots unsafe.Pointer // pointer to the start of the slots array
}

func NewConsumer(shmName string) (*Consumer, error) {
	fd, err := syscall.Open("/dev/shm"+shmName, syscall.O_RDWR, 0)
	if err != nil {
		return nil, fmt.Errorf("open shm: %w", err)
	}
	defer syscall.Close(fd)

	total := int(unsafe.Sizeof(uint64(0))*2) + SlotCount*SlotSize

	data, err := syscall.Mmap(fd, 0, total,
		syscall.PROT_READ|syscall.PROT_WRITE, syscall.MAP_SHARED)
	if err != nil {
		return nil, fmt.Errorf("mmap: %w", err)
	}

	c := &Consumer{
		data:  data,
		head:  (*uint64)(unsafe.Pointer(&data[0])),
		tail:  (*uint64)(unsafe.Pointer(&data[8])),
		slots: unsafe.Pointer(&data[16]),
	}
	return c, nil
}

func (c *Consumer) Close() error {
	return syscall.Munmap(c.data)
}

// ReadFrame blocks (busy-waits) until a frame is available.
// Returned slice points into shm — valid only until the next ReadFrame call.
func (c *Consumer) ReadFrame() ([]byte, FrameHeader, error) {
	for {
		head := atomic.LoadUint64(c.head)
		tail := atomic.LoadUint64(c.tail)

		if tail == head {
			continue // empty — busy-wait for now
		}

		slotIdx := tail % SlotCount
		slotPtr := unsafe.Pointer(uintptr(c.slots) + uintptr(slotIdx)*SlotSize)

		hdr := (*FrameHeader)(slotPtr)
		payloadPtr := unsafe.Pointer(uintptr(slotPtr) + HeaderSize)
		payload := unsafe.Slice((*byte)(payloadPtr), hdr.Size)

		atomic.StoreUint64(c.tail, tail+1)

		return payload, *hdr, nil
	}
}
