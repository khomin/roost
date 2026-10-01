package bootstrap

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

type Config struct {
	Server        ServerConfig   `mapstructure:"server"`
	Authorization Authorization  `mapstructure:"authorization"`
	Database      DatabaseConfig `mapstructure:"database"`
	Redis         RedisConfig    `mapstructure:"redis"`
	Rabbit        RabbitMqConfig `mapstructure:"rabbit"`
}

type ServerConfig struct {
	PortHTTP    int    `mapstructure:"port_http"`
	PortGRPC    int    `mapstructure:"port_grpc"`
	Environment string `mapstructure:"environment"`
	LogPath     string `mapstructure:"log_path"`
}

type Authorization struct {
	IssuerURL string `mapstructure:"issuer_url"`
	ClientID  string `mapstructure:"client_id"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
}

type RedisConfig struct {
	Addr     string `mapstructure:"addr"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type RabbitMqConfig struct {
	Url string `mapstructure:"url"`
}

func NewConfig() *Config {
	config := Config{}
	log := slog.With("Config")
	if err := godotenv.Load(); err != nil {
		log.Info(".env not found, using environment variables")
	}
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.AutomaticEnv()
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("..")

	if err := viper.ReadInConfig(); err != nil {
		log.Error("can't find the file", "err", err)
	}
	err := viper.Unmarshal(&config)
	if err != nil {
		log.Error("environment can't be loaded", "err", err.Error())
	}
	log.Info("environment ready")
	return &config
}

func (c *Config) DSN() string {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s",
		c.Database.User,
		c.Database.Password,
		c.Database.Host,
		c.Database.Port,
		c.Database.Name,
	)
	return dsn
}
