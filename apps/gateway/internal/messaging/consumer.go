package messaging

import (
	"github.com/rabbitmq/amqp091-go"
)

type Consumer struct {
	ch        *amqp091.Channel
	CloseChan chan *amqp091.Error
	mq        *RabbitMQ
	queueName string
}

func NewConsumer(mq *RabbitMQ, queueName string) (*Consumer, error) {
	return &Consumer{
		mq:        mq,
		queueName: queueName,
	}, nil
}

func (p *Consumer) Consume() (<-chan amqp091.Delivery, chan *amqp091.Error, error) {
	if err := p.ensureChannel(); err != nil {
		return nil, nil, err
	}
	delivery, err := p.ch.Consume(p.queueName, "", false, false, false, false, nil)
	if err != nil {
		return nil, nil, err
	}
	return delivery, p.buildNotify(), nil
}

func (p *Consumer) buildNotify() chan *amqp091.Error {
	closeChan := make(chan *amqp091.Error)
	p.ch.NotifyClose(closeChan)
	return closeChan
}

func (p *Consumer) ensureChannel() error {
	if p.ch != nil && !p.ch.IsClosed() {
		return nil
	}
	p.ch = nil
	ch, err := p.mq.NewChannel()
	if err != nil {
		return err
	}
	p.ch = ch
	return nil
}
