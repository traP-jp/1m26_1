package handler

import (
	"encoding/json"
	"net/http"

	"github.com/labstack/echo/v4"
)

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
func sendRequsetToTraQ(code string) (*OAuthResponse, error) {
	result, err := http.NewRequest("POST", "https://q.trap.jp/oauth2/token?grant_type=authorization_code&client_id=dN8CR7tqtHtFRYwzZod1MzvrkLRtkCpop5GC&code=" + code, nil)
	if err != nil {
		return nil, err
	}
	defer result.Body.Close()
	var res OAuthResponse
	json.NewDecoder(result.Body).Decode(&res)
	return &res, nil
}

func OAuth(c echo.Context) error {
	var data ReqBody
	if err := c.Bind(&data); err != nil {
		return c.JSON(http.StatusInternalServerError, nil)
	}
	res, err2 := sendRequsetToTraQ(data.Code)
	if err2 != nil {
		return c.JSON(http.StatusForbidden, nil)
	}
	return c.JSON(http.StatusOK, *res)
}