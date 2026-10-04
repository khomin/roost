#ifndef DETECTION_WORK_ITEM_H
#define DETECTION_WORK_ITEM_H

#include <vector>
#include <algorithm>
#include <opencv2/dnn.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>

struct DetectionWorkItem {
    cv::Mat frame;
    int frame_count;
    std::vector<cv::Rect> detections;
    std::vector<int> class_ids;
    std::vector<float> confidences;
    std::vector<std::string> names;
};

#endif // DETECTION_WORK_ITEM_H
