
#include "detector.h"

#include <fstream>
#include <sstream>
#include <iostream>
#include <vector>
#include <algorithm>
#include <limits>
#include <opencv2/dnn.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>

// --- Configuration Constants ---
const float INPUT_WIDTH = 640.0;
const float INPUT_HEIGHT = 640.0;
const float CONF_THRESHOLD = 0.50; // Minimum confidence to keep a box
const float NMS_THRESHOLD = 0.50;  // IoU threshold for Non-Maximum Suppression
const int INFERENCE_SKIP = 4;

// --- Tracking Constants ---
const float MATCH_IoU_THRESHOLD = 0.3f;
const int MAX_MISSED = 10; // remove tracker after this many skipped frames

Detector::Detector(std::vector<std::string> class_names,
                   std::string module_path
) :
    _class_names(class_names),
    _module_path(module_path)
{

}

Detector::~Detector() {
    _frame_queue.request_shutdown();
}

int Detector::start() {
    if (_class_names.empty()) {
        std::cerr << "ERROR: class names should not be empty!" << std::endl;
        return -1;
    }
    _net = cv::dnn::readNetFromONNX(_module_path);
    if (_net.empty()) {
        std::cerr << "ERROR: Failed to load ONNX model!" << std::endl;
        return -1;
    }

    // Set backend and target for performance optimization (Crucial for TBB/CPU)
    _net.setPreferableBackend(cv::dnn::DNN_BACKEND_OPENCV);
    _net.setPreferableTarget(cv::dnn::DNN_TARGET_CPU);

    if(_thread.joinable()) {
        _thread.join();
    }
    _running = true;
    _thread = std::thread([&] {
        while (_running) {
            std::optional<FrameItem> frame_item = _frame_queue.pop();
            if(frame_item.has_value()) {
                processFrame(frame_item.value());

                _frame_count++;

                // cv::imshow("YOLOv5 C++ Detection Kalman Smoothed", frame_item.value().frame);
                // cv::waitKey(1);
            }
        }
        std::cerr << "INFO: Exiting loop." << std::endl;
    });

    // cv::VideoCapture cap(_camera_id);
    // cap.set(cv::CAP_PROP_FRAME_WIDTH, 640);
    // cap.set(cv::CAP_PROP_FRAME_HEIGHT, 480);
    // if (!cap.isOpened()) {
    //     std::cerr << "ERROR: Could not open camera 0." << std::endl;
    //     return -1;
    // }


    // cv::Mat frame;
    // std::vector<cv::Scalar> colors;
    // std::vector<Tracker> trackers;
    // colors.push_back(cv::Scalar(0, 255, 0));
    // colors.push_back(cv::Scalar(0, 255, 255));
    // colors.push_back(cv::Scalar(255, 255, 0));
    // colors.push_back(cv::Scalar(255, 0, 0));
    // colors.push_back(cv::Scalar(0, 0, 255));

    // while (cap.read(frame)) {
    //     int64 time_start = cv::getTickCount();

    //     // storage for detections this frame (only filled on inference frames)
    //     std::vector<cv::Rect> detections;
    //     std::vector<int> det_class_ids;
    //     std::vector<float> det_confidences;

    //     if (_frame_count % INFERENCE_SKIP == 0) {
    //         std::vector<cv::Mat> outs;

    //         // --- Pre-processing (Image to Blob) ---
    //         cv::Mat blob;
    //         cv::dnn::blobFromImage(frame, blob, 1/255.0, cv::Size(INPUT_WIDTH, INPUT_HEIGHT), cv::Scalar(), true, false);
    //         net.setInput(blob);

    //         // --- Inference (Forward Pass) ---
    //         net.forward(outs, net.getUnconnectedOutLayersNames());

    //         // --- Post-processing (NMS and prepare lists) ---
    //         // Reused logic from your process_predictions, but we push into detections vector instead of drawing directly
    //         cv::Mat outsMat = outs[0];
    //         cv::Mat det_output(outsMat.size[1], outsMat.size[2], CV_32F, outsMat.ptr<float>());
    //         for (int i = 0; i < det_output.rows; i++) {
    //             float confidence = det_output.at<float>(i, 4);
    //             if (confidence < 0.25f) continue;
    //             cv::Mat classes_scores = det_output.row(i).colRange(5, outsMat.size[2]);
    //             cv::Point class_id_point;
    //             double score;
    //             minMaxLoc(classes_scores, 0, &score, 0, &class_id_point);
    //             if (score > 0.25) {
    //                 float x_factor = frame.cols / 640.0f;
    //                 float y_factor = frame.rows / 640.0f;
    //                 float cx = det_output.at<float>(i, 0);
    //                 float cy = det_output.at<float>(i, 1);
    //                 float ow = det_output.at<float>(i, 2);
    //                 float oh = det_output.at<float>(i, 3);
    //                 int x = static_cast<int>((cx - 0.5f * ow) * x_factor);
    //                 int y = static_cast<int>((cy - 0.5f * oh) * y_factor);
    //                 int width = static_cast<int>(ow * x_factor);
    //                 int height = static_cast<int>(oh * y_factor);
    //                 cv::Rect box;
    //                 box.x = x;
    //                 box.y = y;
    //                 box.width = width;
    //                 box.height = height;
    //                 detections.push_back(box);
    //                 det_class_ids.push_back(class_id_point.x);
    //                 det_confidences.push_back(static_cast<float>(score));
    //             }
    //         }

    //         // NMS
    //         std::vector<int> indexes;
    //         cv::dnn::NMSBoxes(detections, det_confidences, 0.25f, 0.50f, indexes);

    //         // keep only NMSed lists
    //         std::vector<cv::Rect> nms_boxes;
    //         std::vector<int> nms_class_ids;
    //         std::vector<float> nms_confidences;
    //         for (int idx : indexes) {
    //             nms_boxes.push_back(detections[idx]);
    //             nms_class_ids.push_back(det_class_ids[idx]);
    //             nms_confidences.push_back(det_confidences[idx]);
    //         }
    //         detections.swap(nms_boxes);
    //         det_class_ids.swap(nms_class_ids);
    //         det_confidences.swap(nms_confidences);

    //         // --- Update trackers with detections ---
    //         process_predictions_and_update_trackers(frame, outs[0], colors, time_start,
    //                                                 detections, det_class_ids, det_confidences,
    //                                                 trackers);
    //         outs.clear();
    //     } else {
    //         // no inference this frame: just predict and draw trackers
    //         for (auto &tr : trackers) {
    //             // predict step
    //             cv::Mat prediction = tr.kf.predict();
    //             // increase missed frames (we didn't see a detection to correct)
    //             tr.missed_frames++;
    //         }
    //         draw_trackers(frame, colors, time_start, trackers);
    //     }

    //     _frame_count++;

    //     send_result(detections, det_class_ids, det_confidences, frame);

    //     // --- Display ---
    //     imshow("YOLOv5 C++ Detection Kalman Smoothed", frame);
    //     cv::waitKey(1);
    // }

    // cap.release();
    // cv::destroyAllWindows();
    return 0;
}

void Detector::setCallback(std::function<void(DetectionWorkItem& item)> v) {
    _onFrame = v;
}

void Detector::pushFrame(FrameItem& frame) {
    _frame_queue.push(std::move(frame));
}

void Detector::processFrame(FrameItem& frameItem) {
    std::vector<cv::Scalar> colors;
    std::vector<Tracker> trackers;
    colors.push_back(cv::Scalar(0, 255, 0));
    colors.push_back(cv::Scalar(0, 255, 255));
    colors.push_back(cv::Scalar(255, 255, 0));
    colors.push_back(cv::Scalar(255, 0, 0));
    colors.push_back(cv::Scalar(0, 0, 255));

    int64 time_start = cv::getTickCount();

    // storage for detections this frame (only filled on inference frames)
    std::vector<cv::Rect> detections;
    std::vector<int> det_class_ids;
    std::vector<float> det_confidences;

    cv::Mat frame = frameItem.frame;

    if (_frame_count % INFERENCE_SKIP == 0) {
        std::vector<cv::Mat> outs;

        // --- Pre-processing (Image to Blob) ---
        cv::Mat blob;
        cv::dnn::blobFromImage(frame, blob, 1/255.0, cv::Size(INPUT_WIDTH, INPUT_HEIGHT), cv::Scalar(), true, false);
        _net.setInput(blob);

        // --- Inference (Forward Pass) ---
        _net.forward(outs, _net.getUnconnectedOutLayersNames());

        // --- Post-processing (NMS and prepare lists) ---
        // Reused logic from your process_predictions, but we push into detections vector instead of drawing directly
        cv::Mat outsMat = outs[0];
        cv::Mat det_output(outsMat.size[1], outsMat.size[2], CV_32F, outsMat.ptr<float>());
        for (int i = 0; i < det_output.rows; i++) {
            float confidence = det_output.at<float>(i, 4);
            if (confidence < 0.25f) continue;
            cv::Mat classes_scores = det_output.row(i).colRange(5, outsMat.size[2]);
            cv::Point class_id_point;
            double score;
            minMaxLoc(classes_scores, 0, &score, 0, &class_id_point);
            if (score > 0.25) {
                float x_factor = frame.cols / 640.0f;
                float y_factor = frame.rows / 640.0f;
                float cx = det_output.at<float>(i, 0);
                float cy = det_output.at<float>(i, 1);
                float ow = det_output.at<float>(i, 2);
                float oh = det_output.at<float>(i, 3);
                int x = static_cast<int>((cx - 0.5f * ow) * x_factor);
                int y = static_cast<int>((cy - 0.5f * oh) * y_factor);
                int width = static_cast<int>(ow * x_factor);
                int height = static_cast<int>(oh * y_factor);
                cv::Rect box;
                box.x = x;
                box.y = y;
                box.width = width;
                box.height = height;
                detections.push_back(box);
                det_class_ids.push_back(class_id_point.x);
                det_confidences.push_back(static_cast<float>(score));
            }
        }

        // NMS
        std::vector<int> indexes;
        cv::dnn::NMSBoxes(detections, det_confidences, 0.25f, 0.50f, indexes);

        // keep only NMSed lists
        std::vector<cv::Rect> nms_boxes;
        std::vector<int> nms_class_ids;
        std::vector<float> nms_confidences;
        for (int idx : indexes) {
            nms_boxes.push_back(detections[idx]);
            nms_class_ids.push_back(det_class_ids[idx]);
            nms_confidences.push_back(det_confidences[idx]);
        }
        detections.swap(nms_boxes);
        det_class_ids.swap(nms_class_ids);
        det_confidences.swap(nms_confidences);

        // --- Update trackers with detections ---
        process_predictions_and_update_trackers(frame, outs[0], colors, time_start,
                                                detections, det_class_ids, det_confidences,
                                                trackers);
        outs.clear();
    } else {
        // no inference this frame: just predict and draw trackers
        for (auto &tr : trackers) {
            // predict step
            cv::Mat prediction = tr.kf.predict();
            // increase missed frames (we didn't see a detection to correct)
            tr.missed_frames++;
        }
        draw_trackers(frame, colors, time_start, trackers);
    }
    send_result(detections, det_class_ids, det_confidences, frame);
}

void Detector::send_result(std::vector<cv::Rect>& detections,
                           std::vector<int>& det_class_ids,
                           std::vector<float>& det_confidences,
                           cv::Mat& frame) {
    if (detections.size() != det_class_ids.size() || detections.size() != det_confidences.size()) {
        std::cerr << "Error: Detection result vectors have mismatched sizes." << std::endl;
        return;
    }
    DetectionWorkItem item;
    item.frame = frame.clone(); // Take a copy so main thread can keep drawing
    item.frame_count = _frame_count;
    item.detections = detections;
    item.class_ids = det_class_ids;
    item.confidences = det_confidences;
    item.names = _class_names;

    if(_onFrame) {
        _onFrame(item);
    }

//    tracker::FrameUpdate frame_update;
//    frame_update.set_frame_number(_frame_count);

//    std::vector<uchar> buffer;
//    std::vector<int> compression_params;
//    // Optional: set JPEG quality (0-100), default is 95.
//    // Lower quality saves bandwidth.
//    compression_params.push_back(cv::IMWRITE_JPEG_QUALITY);
//    compression_params.push_back(80);

//    auto ok = cv::imencode(".jpeg", frame, buffer, compression_params);
//    if(ok) {
//        frame_update.set_encoded_frame(buffer.data(), buffer.size());
//    }

//    for (size_t i = 0; i < detections.size(); ++i) {
//        const cv::Rect& rect = detections[i];

//        // IMPORTANT: repeated fields have an 'Add()' method.
//        // This creates a new 'TrackEvent' sub-message and returns a pointer to it.
//        tracker::TrackEvent* event = frame_update.add_events();

//        // --- Populate TrackEvent fields ---
//        event->set_tracker_id(DETECTOR_NODE_ID);
//        event->set_timestamp_ms(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count());
//        event->set_class_name(_class_names[i]);
//        event->set_class_id(det_class_ids[i]);
//        event->set_confidence(det_confidences[i]);

//        // --- Populate the BoundingBox sub-message ---
//        tracker::BoundingBox* bbox = event->mutable_box();
//        bbox->set_x(rect.x);
//        bbox->set_y(rect.y);
//        bbox->set_width(rect.width);
//        bbox->set_height(rect.height);
//    }
//    if(onFrameReady) {
//        onFrameReady(frame_update);
//    }
}

float Detector::iou(const cv::Rect& a, const cv::Rect& b) {
    int x1 = std::max(a.x, b.x);
    int y1 = std::max(a.y, b.y);
    int x2 = std::min(a.x + a.width, b.x + b.width);
    int y2 = std::min(a.y + a.height, b.y + b.height);
    int interW = x2 - x1;
    int interH = y2 - y1;
    if (interW <= 0 || interH <= 0) return 0.0f;
    float interArea = static_cast<float>(interW) * interH;
    float unionA = static_cast<float>(a.width) * a.height + static_cast<float>(b.width) * b.height - interArea;
    return interArea / unionA;
}

cv::Rect Detector::rect_from_state(const cv::Mat& state) {
    // state: [x, y, w, h, vx, vy, vw, vh]^T
    float x = state.at<float>(0);
    float y = state.at<float>(1);
    float w = state.at<float>(2);
    float h = state.at<float>(3);
    cv::Rect r;
    r.x = static_cast<int>(x);
    r.y = static_cast<int>(y);
    r.width = std::max(1, static_cast<int>(w));
    r.height = std::max(1, static_cast<int>(h));
    return r;
}

cv::Mat Detector::state_from_rect(const cv::Rect& r) {
    cv::Mat state = cv::Mat::zeros(8, 1, CV_32F);
    state.at<float>(0) = static_cast<float>(r.x);
    state.at<float>(1) = static_cast<float>(r.y);
    state.at<float>(2) = static_cast<float>(r.width);
    state.at<float>(3) = static_cast<float>(r.height);
    // velocities default 0
    return state;
}

cv::KalmanFilter Detector::create_kalman_for_rect(const cv::Rect& r) {
    int stateSize = 8;
    int measSize = 4;
    int contrSize = 0;
    cv::KalmanFilter kf(stateSize, measSize, contrSize, CV_32F);

    // Transition matrix A
    // [1 0 0 0 1 0 0 0]
    // [0 1 0 0 0 1 0 0]
    // [0 0 1 0 0 0 1 0]
    // [0 0 0 1 0 0 0 1]
    // velocities remain
    kf.transitionMatrix = cv::Mat::eye(stateSize, stateSize, CV_32F);
    kf.transitionMatrix.at<float>(0,4) = 1.0f;
    kf.transitionMatrix.at<float>(1,5) = 1.0f;
    kf.transitionMatrix.at<float>(2,6) = 1.0f;
    kf.transitionMatrix.at<float>(3,7) = 1.0f;

    // Measurement matrix H (maps state to measurements)
    kf.measurementMatrix = cv::Mat::zeros(measSize, stateSize, CV_32F);
    kf.measurementMatrix.at<float>(0,0) = 1.0f; // x
    kf.measurementMatrix.at<float>(1,1) = 1.0f; // y
    kf.measurementMatrix.at<float>(2,2) = 1.0f; // w
    kf.measurementMatrix.at<float>(3,3) = 1.0f; // h

    // Process noise covariance Q
    cv::setIdentity(kf.processNoiseCov, cv::Scalar::all(1e-2f));
    // Measurement noise covariance R
    cv::setIdentity(kf.measurementNoiseCov, cv::Scalar::all(1e-1f));
    // Posterior error covariance P
    cv::setIdentity(kf.errorCovPost, cv::Scalar::all(1.0f));

    // initial state
    cv::Mat initState = state_from_rect(r);
    initState.copyTo(kf.statePost);

    return kf;
}

void Detector::process_predictions_and_update_trackers(cv::Mat& frame, cv::Mat& outs,
                                             const std::vector<cv::Scalar>& colors,
                                             int64& time_start,
                                             std::vector<cv::Rect>& detections,
                                             std::vector<int>& det_class_ids,
                                             std::vector<float>& det_confidences,
                                             std::vector<Tracker>& trackers) {
    // For each tracker predict first (so we can match predictions to detections)
    std::vector<cv::Rect> predicted_boxes;
    predicted_boxes.reserve(trackers.size());
    for (auto &tr : trackers) {
        cv::Mat pred = tr.kf.predict();
        predicted_boxes.push_back(rect_from_state(pred));
    }

    // Build IoU cost matrix
    int T = static_cast<int>(trackers.size());
    int D = static_cast<int>(detections.size());
    std::vector<std::vector<float>> iou_mat(T, std::vector<float>(D, 0.0f));
    for (int t = 0; t < T; ++t) {
        for (int d = 0; d < D; ++d) {
            iou_mat[t][d] = iou(predicted_boxes[t], detections[d]);
        }
    }

    // Greedy matching: pick best IoU pairs until IoU < threshold
    std::vector<int> matchT(T, -1); // tracker -> detection idx, -1 if none
    std::vector<int> matchD(D, -1); // detection -> tracker idx

    while (true) {
        float bestIoU = MATCH_IoU_THRESHOLD;
        int bestT = -1, bestD = -1;
        for (int t = 0; t < T; ++t) {
            for (int d = 0; d < D; ++d) {
                if (matchT[t] != -1 || matchD[d] != -1) continue;
                if (iou_mat[t][d] > bestIoU) {
                    bestIoU = iou_mat[t][d];
                    bestT = t;
                    bestD = d;
                }
            }
        }
        if (bestT == -1) break;
        matchT[bestT] = bestD;
        matchD[bestD] = bestT;
    }

    // Update matched trackers with measurements
    for (int t = 0; t < T; ++t) {
        if (matchT[t] != -1) {
            int d = matchT[t];
            // measurement vector
            cv::Mat meas = cv::Mat::zeros(4,1,CV_32F);
            meas.at<float>(0) = static_cast<float>(detections[d].x);
            meas.at<float>(1) = static_cast<float>(detections[d].y);
            meas.at<float>(2) = static_cast<float>(detections[d].width);
            meas.at<float>(3) = static_cast<float>(detections[d].height);
            trackers[t].kf.correct(meas);
            trackers[t].missed_frames = 0;
            trackers[t].class_id = det_class_ids[d];
            trackers[t].last_confidence = det_confidences[d];
        } else {
            // no detection matched: we already predicted above; mark missed
            trackers[t].missed_frames++;
        }
    }

    // Create trackers for unmatched detections
    for (int d = 0; d < D; ++d) {
        if (matchD[d] == -1) {
            Tracker tr;
            tr.kf = create_kalman_for_rect(detections[d]);
            tr.id = _next_tracker_id++;
            tr.class_id = det_class_ids[d];
            tr.last_confidence = det_confidences[d];
            tr.missed_frames = 0;
            trackers.push_back(std::move(tr));
        }
    }

    // Remove dead trackers
    trackers.erase(std::remove_if(trackers.begin(), trackers.end(),
                                  [](const Tracker& tr) { return tr.missed_frames > MAX_MISSED; }),
                   trackers.end());

    // Draw trackers (using updated states)
    draw_trackers(frame, colors, time_start, trackers);
}

void Detector::draw_trackers(cv::Mat& frame,
                   const std::vector<cv::Scalar>& colors,
                   int64& time_start,
                   std::vector<Tracker>& trackers) {
    for (auto &tr : trackers) {
        cv::Mat state = tr.kf.statePost; // use posterior if available
        // but if recently predicted (no correct), statePost is still valid; otherwise predict above was called
        cv::Rect box = rect_from_state(state);

        int cls = tr.class_id >= 0 ? tr.class_id : 0;
        float conf = tr.last_confidence;

        // clamp box inside frame
        box &= cv::Rect(0,0,frame.cols, frame.rows);

        cv::rectangle(frame, box, colors[cls % colors.size()], 2, 8);

        std::string label = (tr.class_id >= 0 ? _class_names[tr.class_id] : std::string("obj")) + ": " + cv::format("%.2f", conf);

        cv::rectangle(frame,
                      cv::Point(box.tl().x, box.tl().y - 24),
                      cv::Point(box.br().x, box.tl().y),
                      cv::Scalar(255, 255, 255), -1);

        cv::putText(frame, label,
                    cv::Point(box.tl().x + 2, box.tl().y - 6),
                    cv::FONT_HERSHEY_SIMPLEX, 0.5, cv::Scalar(0,0,0));
    }
//    float t = (cv::getTickCount() - time_start) / static_cast<float>(cv::getTickFrequency());
//    cv::putText(frame, cv::format("FPS: %.2f", 1.0 / t), cv::Point(20, 40), cv::FONT_HERSHEY_PLAIN, 2.0, cv::Scalar(255, 0, 0), 2, 8);
}
