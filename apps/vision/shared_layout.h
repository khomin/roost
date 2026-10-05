#pragma once
#include <stdint.h>

namespace roost::ipc {
    constexpr uint32_t SlotCount = 16;
    constexpr uint32_t SlotSize  = 4 * 1024 * 1024;
}

typedef struct {
    uint64_t timestamp_ns;
    uint32_t size;
    uint32_t flags;         // bit 0 = keyframe
    // frame bytes follow
} FrameHeader;

// shared_layout.h - include this from BOTH C++ and Go (Go reads it as raw bytes)
typedef struct {
    uint64_t head;   // written only by producer
    uint64_t tail;   // written only by consumer
    uint8_t  slots[roost::ipc::SlotCount][roost::ipc::SlotSize];
} SharedRingBuffer;