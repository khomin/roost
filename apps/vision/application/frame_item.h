#ifndef FRAME_ITEM_H
#define FRAME_ITEM_H

#include <opencv2/opencv.hpp>

struct FrameItem {
    cv::Mat frame;
    long long timestamp;
    int frame_index;
};

#endif // FRAME_ITEM_H
