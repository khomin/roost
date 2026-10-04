#ifndef FRAME_SOURCE_H
#define FRAME_SOURCE_H

#include <functional>
#include <thread>
#include <opencv2/opencv.hpp>

#include "frame_item.h"

class FrameSource {
public:
    FrameSource();
    virtual ~FrameSource() = default;

    virtual bool open() = 0;
    virtual void stop() = 0;

    std::function<void(FrameItem& item)> onFrame;
};

class FrameSourceOpenCV : public FrameSource {
public:
    FrameSourceOpenCV() = delete;
    FrameSourceOpenCV(int camera_id);
    ~FrameSourceOpenCV() override;

    bool open() override;
    void stop() override;

    void setCallBack(std::function<void(FrameItem& item)> v);

private:
    void _stopInternal();

    cv::VideoCapture _cap;
    int _camera_id = 0;
    std::thread _thread;
    std::atomic<bool> _running{false};
};

#endif // FRAME_SOURCE_H
