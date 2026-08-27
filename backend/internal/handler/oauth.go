package handler

import (
	"encoding/json"
	"net/http"

	"log"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	http.HandleFunc("/api/ws", handleClient)

	log.Fatal(http.ListenAndServe(":8000", nil))
}

func handleClient(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	// conn が localhost 側の WebSocket connection

}

func connectTrap() (*websocket.Conn, error) {
	header := http.Header{}

	header.Set("Origin", "https://q.trap.jp")
	header.Set("Cookie", "...")

	header.Set("Origin", "https://q.trap.jp")

	conn, _, err := websocket.DefaultDialer.Dial(
		"wss://q.trap.jp/api/v3/ws",
		header,
	)
	return conn, err
}

type OAuthResponse struct {
	AccessToken  string  `json:"access_token"`
	ExpiresIn    int     `json:"expires_in"`
	RefreshToken *string `json:"refresh_token,omitempty"`

	// TokenType Example: Bearer
	TokenType string `json:"token_type"`
}

type ReqBody struct {
	Code string `json:"code"`
}

func sendRequset(code string, r_session string) (*OAuthResponse, error) {
	req, err := http.NewRequest("POST", "https://q.trap.jp/oauth2/token?grant_type=authorization_code&client_id=dN8CR7tqtHtFRYwzZod1MzvrkLRtkCpop5GC&code="+code, nil)
	if err != nil {
		return nil, err
	}
	cookie := &http.Cookie{
		Name:  "r_session",
		Value: r_session,
	}
	req.AddCookie(cookie)
	res2, err2 := http.DefaultClient.Do(req)
	if err2 != nil {
		return nil, err2
	}
	defer res2.Body.Close()
	var res OAuthResponse
	json.NewDecoder(res2.Body).Decode(&res)
	return &res, nil
}

func OAuth(c echo.Context) error {
	var data ReqBody
	if err := c.Bind(&data); err != nil {
		return c.JSON(http.StatusInternalServerError, nil)
	}
	rs, err3 := c.Cookie("r_session")
	if err3 != nil {
		return c.JSON(http.StatusUnauthorized, nil)
	}
	res, err2 := sendRequset(data.Code, rs.Value)
	if err2 != nil {
		return c.JSON(http.StatusForbidden, nil)
	}
	return c.JSON(http.StatusOK, *res)
}
