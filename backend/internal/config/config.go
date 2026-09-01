package config

import (
	"net/url"
	"os"
	"strings"
)

type Config struct {
	Port             string
	CORSAllowOrigins []string

	// TraQBaseURL は traQ API v3 のベース URL。OIDC discovery の
	// https://q.trap.jp/.well-known/openid-configuration と揃える。
	TraQBaseURL string
	// TraQClientID は traQ に登録した OAuth クライアントの ID。
	TraQClientID string
	// TraQClientSecret は confidential クライアントの場合のみ設定する。
	// 空の場合はクライアント認証を付けずにトークン交換する。
	TraQClientSecret string
}

func Load() Config {
	return Config{
		Port:             env("PORT", "8080"),
		CORSAllowOrigins: envList("CORS_ALLOW_ORIGINS", []string{"http://localhost:5173", "http://127.0.0.1:5173"}),
		TraQBaseURL:      strings.TrimRight(env("TRAQ_BASE_URL", "https://q.trap.jp/api/v3"), "/"),
		TraQClientID:     env("TRAQ_CLIENT_ID", ""),
		TraQClientSecret: env("TRAQ_CLIENT_SECRET", ""),
	}
}

func (c Config) Addr() string {
	return ":" + c.Port
}

// CORSAllowOriginHosts は CORS 用のオリジン一覧からホスト部分だけを取り出す。
// websocket.AcceptOptions.OriginPatterns はスキームを含まないホストパターンを
// 期待するため、CORS の設定値をそのまま渡すことはできない。
func (c Config) CORSAllowOriginHosts() []string {
	hosts := make([]string, 0, len(c.CORSAllowOrigins))
	for _, origin := range c.CORSAllowOrigins {
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Host == "" {
			continue
		}
		hosts = append(hosts, parsed.Host)
	}
	return hosts
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
