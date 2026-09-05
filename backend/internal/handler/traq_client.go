package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// traQ のエラーレスポンスを丸ごと読み込まないよう上限を設ける。
const maxTraQErrorBodySize = 1 << 20

// TraQClient は traQ API v3 への HTTP アクセスをまとめる。
type TraQClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewTraQClient(baseURL string) *TraQClient {
	return &TraQClient{
		baseURL:    strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// WebSocketURL は traQ の通知ストリーム WebSocket の URL を返す。
func (t *TraQClient) WebSocketURL() string {
	wsURL := t.baseURL + "/ws"
	if after, ok := strings.CutPrefix(wsURL, "https://"); ok {
		return "wss://" + after
	}
	if after, ok := strings.CutPrefix(wsURL, "http://"); ok {
		return "ws://" + after
	}
	return wsURL
}

// get は traQ API v3 に Bearer 認証付きで GET し、レスポンス JSON を dst に読み込む。
// traQ の API v3 は OAuth2 / Bearer 認証を要求するため、トークン無しの呼び出しは 401 になる。
func (t *TraQClient) get(ctx context.Context, token, path string, dst any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, t.baseURL+path, nil)
	if err != nil {
		return err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Accept", "application/json")

	res, err := t.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	/*if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(res.Body, maxTraQErrorBodySize))
		return fmt.Errorf("traQ GET %s returned %d: %s", path, res.StatusCode, strings.TrimSpace(string(body)))
	}*/

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(res.Body, maxTraQErrorBodySize))

		slog.Error("traQ API error",
			"path", path,
			"status", res.StatusCode,
			"body", strings.TrimSpace(string(body)),
		)

		return fmt.Errorf(
			"traQ GET %s returned %d: %s",
			path,
			res.StatusCode,
			strings.TrimSpace(string(body)),
		)
	}

	if dst == nil {
		_, _ = io.Copy(io.Discard, res.Body)
		return nil
	}
	if err := json.NewDecoder(res.Body).Decode(dst); err != nil {
		return fmt.Errorf("decode traQ GET %s response: %w", path, err)
	}
	return nil
}
