package settings

import (
	"context"

	commandbase "volt/commands"
	coresettings "volt/core/settings"
)

const GetLocalizationName = "settings.getLocalization"

type GetLocalizationRequest struct {
	PreferredLocales []string
}

type GetLocalizationResponse struct {
	Payload coresettings.LocalizationPayload
}

type GetLocalizationCommand struct {
	service *coresettings.LocalizationService
}

func NewGetLocalizationCommand(service *coresettings.LocalizationService) *GetLocalizationCommand {
	return &GetLocalizationCommand{service: service}
}

func (c *GetLocalizationCommand) Name() string {
	return GetLocalizationName
}

func (c *GetLocalizationCommand) Execute(ctx context.Context, req any) (any, error) {
	request, err := commandbase.Decode[GetLocalizationRequest](c.Name(), req)
	if err != nil {
		return nil, err
	}

	payload, err := c.service.GetLocalization(request.PreferredLocales)
	if err != nil {
		return nil, err
	}

	return GetLocalizationResponse{Payload: payload}, nil
}
