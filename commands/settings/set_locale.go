package settings

import (
	"context"

	commandbase "volt/commands"
	coresettings "volt/core/settings"
)

const SetLocaleName = "settings.setLocale"

type SetLocaleRequest struct {
	Locale           string
	PreferredLocales []string
}

type SetLocaleResponse struct {
	Payload coresettings.LocalizationPayload
}

type SetLocaleCommand struct {
	service *coresettings.LocalizationService
}

func NewSetLocaleCommand(service *coresettings.LocalizationService) *SetLocaleCommand {
	return &SetLocaleCommand{service: service}
}

func (c *SetLocaleCommand) Name() string {
	return SetLocaleName
}

func (c *SetLocaleCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[SetLocaleRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	payload, err := c.service.SetLocale(request.Locale, request.PreferredLocales)
	if err != nil {
		return nil, err
	}

	return SetLocaleResponse{Payload: payload}, nil
}
