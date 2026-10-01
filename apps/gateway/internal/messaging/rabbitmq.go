package messaging

import "github.com/rabbitmq/amqp091-go"

type RabbitMQ struct {
	conn *amqp091.Connection
	url  string
}

func NewRabbitMQ(url string) (*RabbitMQ, error) {
	conn, err := amqp091.Dial(url)
	if err != nil {
		return nil, err
	}
	return &RabbitMQ{
		conn: conn,
		url:  url,
	}, nil
}

func (r *RabbitMQ) Close() error {
	return r.conn.Close()
}

func (r *RabbitMQ) NewChannel() (*amqp091.Channel, error) {
	if r.conn == nil || r.conn.IsClosed() {
		if conn, err := amqp091.Dial(r.url); err != nil {
			return nil, err
		} else {
			r.conn = conn
		}
	}
	return r.conn.Channel()
}
