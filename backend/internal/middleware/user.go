package middleware

import (
	"strings"
	"sync"
	"time"

	"github.com/gofrs/uuid"

	"github.com/labstack/echo/v4"
)

const userContextKey = "authenticatedUser"

type AuthenticatedUser struct {
	Name    string
	UserId  string
	Id      uuid.UUID
	Session string
}

// UserResolver はアクセストークンから traQ 上のユーザーを引く。
type UserResolver func(ctx echo.Context, token string) (AuthenticatedUser, error)

type resolvedUser struct {
	user      AuthenticatedUser
	expiresAt time.Time
}

// tokenUserCache はトークンごとの解決結果を保持し、リクエストのたびに
// traQ へ問い合わせるのを避ける。
type tokenUserCache struct {
	mu      sync.RWMutex
	entries map[string]resolvedUser
	ttl     time.Duration
}

func newTokenUserCache(ttl time.Duration) *tokenUserCache {
	return &tokenUserCache{
		entries: make(map[string]resolvedUser),
		ttl:     ttl,
	}
}

func (c *tokenUserCache) get(token string) (AuthenticatedUser, bool) {
	c.mu.RLock()
	entry, ok := c.entries[token]
	c.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		return AuthenticatedUser{}, false
	}
	return entry.user, true
}

func (c *tokenUserCache) set(token string, user AuthenticatedUser) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries[token] = resolvedUser{user: user, expiresAt: time.Now().Add(c.ttl)}
}

// Authenticate は認証ミドルウェアを組み立てる。
//
// 身元の決め方は 2 通り:
//  1. X-Forwarded-User — 本番のリバースプロキシが注入する経路。
//  2. Authorization: Bearer — ローカル開発など、プロキシが無い環境の経路。
//     resolve でトークンから traQ 上のユーザーを引く。
//
// どちらも無い場合は認証情報を設定せず、後段のハンドラが 401 を返せるようにする。
func Authenticate(resolve UserResolver) echo.MiddlewareFunc {
	cache := newTokenUserCache(5 * time.Minute)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if userID := strings.TrimSpace(c.Request().Header.Get("X-Forwarded-User")); userID != "" {
				c.Set(userContextKey, AuthenticatedUser{
					UserId: userID,
					Name:   userID,
				})
				return next(c)
			}

			token := bearerToken(c.Request().Header.Get("Authorization"))
			if token == "" {
				// ブラウザの WebSocket API は任意のヘッダを送れないため、
				// WebSocket 接続だけはクエリパラメータのトークンを受け付ける。
				token = strings.TrimSpace(c.QueryParam("token"))
			}
			if token == "" || resolve == nil {
				return next(c)
			}

			if user, ok := cache.get(token); ok {
				c.Set(userContextKey, user)
				return next(c)
			}

			user, err := resolve(c, token)
			if err != nil {
				// 解決できないトークンは未認証として扱い、後段に判断を任せる。
				return next(c)
			}
			user.Session = token
			cache.set(token, user)
			c.Set(userContextKey, user)
			return next(c)
		}
	}
}

func bearerToken(header string) string {
	const prefix = "Bearer "
	if len(header) < len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return ""
	}
	return strings.TrimSpace(header[len(prefix):])
}

func GetAuthenticatedUser(c echo.Context) (AuthenticatedUser, bool) {
	user, ok := c.Get(userContextKey).(AuthenticatedUser)
	return user, ok
}
