package config

import (
	"os"
	"strings"
)

type Config struct {
	Port             string
	CORSAllowOrigins []string
}

func Load() Config {
	return Config{
		Port:             env("PORT", "8080"),
		CORSAllowOrigins: envList("CORS_ALLOW_ORIGINS", []string{"http://localhost:5173", "http://127.0.0.1:5173"}),
	}
}

func (c Config) Addr() string {
	return ":" + c.Port
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envList(key string, fallback []string) []string {
	rawValue := strings.TrimSpace(os.Getenv(key))
	if rawValue == "" {
		return fallback
	}

	values := make([]string, 0)
	for item := range strings.SplitSeq(rawValue, ",") {
		item = strings.TrimSpace(item)
		if item != "" {
			values = append(values, item)
		}
	}
	return values
}
