package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/traP-jp/1m26_1/backend/internal/config"
	"github.com/traP-jp/1m26_1/backend/internal/handler"
)

func TestHealthz(t *testing.T) {
	e := New(testConfig())
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
}

// 認証情報が何も無いリクエストは 401 になる。
// 以前はリテラル "traP" にフォールバックしていたため、誰がログインしても
// 同一ユーザーとして扱われていた。
func TestGetMeRequiresCredentials(t *testing.T) {
	e := New(testConfig())
	req := httptest.NewRequest(http.MethodGet, "/api/users/me", nil)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

// 本番はリバースプロキシが X-Forwarded-User を注入する。
func TestGetMeUsesForwardedUser(t *testing.T) {
	e := New(testConfig())
	req := httptest.NewRequest(http.MethodGet, "/api/users/me", nil)
	req.Header.Set("X-Forwarded-User", "Ayuto1123")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body handler.UserResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body.UserId != "Ayuto1123" || body.Name != "Ayuto1123" {
		t.Fatalf("unexpected response: %+v", body)
	}
}

func testConfig() config.Config {
	return config.Config{
		Port:             "8080",
		CORSAllowOrigins: []string{"http://localhost:5173"},
	}
}
