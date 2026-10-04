#ifndef SAFE_QUEUE_H
#define SAFE_QUEUE_H

#include <queue>
#include <mutex>
#include <optional>
#include <condition_variable>

template <typename T>
class SafeQueue {
    std::queue<T> queue_;
    std::mutex mutex_;
    std::condition_variable cond_;
    size_t max_size_ = 10; // Drop frames if network is too slow
    bool shutdown_ = false;

public:
    void push(T item) {
        std::unique_lock<std::mutex> lock(mutex_);
        if (queue_.size() > max_size_) queue_.pop(); // Drop oldest frame
        queue_.push(std::move(item));
        lock.unlock();
        cond_.notify_one();
    }

    std::optional<T> pop() {
        std::unique_lock<std::mutex> lock(mutex_);
        cond_.wait(lock, [this] {
            return !queue_.empty() || shutdown_;
        });

        if (shutdown_ && queue_.empty()) return std::nullopt;

        T item = std::move(queue_.front());
        queue_.pop();
        return item;
    }

    bool empty() {
        std::lock_guard<std::mutex> lock(mutex_);
        return queue_.empty();
    }

    void request_shutdown() {
        {
            std::lock_guard<std::mutex> lock(mutex_);
            shutdown_ = true;
        }
        cond_.notify_all();
    }
};

#endif // SAFE_QUEUE_H
