#include "frame_source.h"

FrameSource::FrameSource() {}

FrameSourceOpenCV::FrameSourceOpenCV(int camera_id) {
    _camera_id = camera_id;
}

FrameSourceOpenCV::~FrameSourceOpenCV() {
    _stopInternal();
}

bool FrameSourceOpenCV::open() {
    _cap = cv::VideoCapture(_camera_id);
    _cap.set(cv::CAP_PROP_FRAME_WIDTH, 640);
    _cap.set(cv::CAP_PROP_FRAME_HEIGHT, 480);
    if (!_cap.isOpened()) {
        std::cerr << "ERROR: Could not open camera 0." << std::endl;
        return false;
    }
    if(_thread.joinable()) {
        _thread.join();
    }
    _running = true;
    _thread = std::thread([&] {
        uint64_t frame_index = 0;

        while (_running) {
            cv::Mat frame;
            if(_cap.read(frame)) {
                int64 time_start = cv::getTickCount();
                FrameItem frame_item = FrameItem();
                frame_item.frame = std::move(frame);
                frame_item.frame_index = frame_index++;
                frame_item.timestamp = time_start;
                onFrame(frame_item);
            }
        }
        std::cerr << "INFO: Exiting loop." << std::endl;
    });
    return true;
}

void FrameSourceOpenCV::stop() {

}

void FrameSourceOpenCV::setCallBack(std::function<void(FrameItem& item)> v) {
    onFrame = v;
}

void FrameSourceOpenCV::_stopInternal() {
    if (_cap.isOpened()) {
        _cap.release();
    }
    if(_thread.joinable()) {
        _thread.join();
    }
}