#ifndef DETECTOR_H
#define DETECTOR_H

#include <string>
#include <functional>
#include <opencv2/video/tracking.hpp>
#include <thread>
#include "detection_work_item.h"
#include "safe_queue.h"
#include "frame_item.h"

struct Tracker {
    cv::KalmanFilter kf;
    int id;
    int class_id;
    float last_confidence;
    int missed_frames;

    Tracker() : id(-1), class_id(-1), last_confidence(0.0f), missed_frames(0) {}
};

class Detector
{
public:
    Detector(std::vector<std::string> class_names, std::string module_path);
    ~Detector();

    int start();

    void setCallback(std::function<void(DetectionWorkItem& item)> v);

    void pushFrame(FrameItem& frame);

private:

    void send_result(
        std::vector<cv::Rect>& detections,
        std::vector<int>& det_class_ids,
        std::vector<float>& det_confidences,
        cv::Mat& frame
     );

    void processFrame(FrameItem& frame);

    void process_predictions_and_update_trackers(cv::Mat& frame, cv::Mat& outs, const std::vector<cv::Scalar>& colors,
                                                 int64& time_start,
                                                 std::vector<cv::Rect>& detections,
                                                 std::vector<int>& det_class_ids,
                                                 std::vector<float>& det_confidences,
                                                 std::vector<Tracker>& trackers);

    void draw_trackers(cv::Mat& frame, const std::vector<cv::Scalar>& colors, int64& time_start, std::vector<Tracker>& trackers);

    // utility
    float iou(const cv::Rect& a, const cv::Rect& b);
    cv::Rect rect_from_state(const cv::Mat& state); // state -> rect (x,y,w,h)
    cv::Mat state_from_rect(const cv::Rect& r); // rect -> state (x,y,w,h,0,0,0,0)
    cv::KalmanFilter create_kalman_for_rect(const cv::Rect& r);

    std::function<void(DetectionWorkItem& item)> _onFrame;

    std::thread _thread;
    std::atomic<bool> _running{false};
    SafeQueue<FrameItem> _frame_queue;

    std::vector<std::string> _class_names;
    cv::dnn::Net _net;
    std::string _module_path;
    int _next_tracker_id = 0;
    int _frame_count = 0;
};

#endif // DETECTOR_H
