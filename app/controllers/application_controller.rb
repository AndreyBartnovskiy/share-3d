class ApplicationController < ActionController::Base
  allow_browser versions: :modern

  # protect_from_forgery with: :exception
  # before_action :authenticate_user! аутентификация
  layout :layout_by_resource

  helper_method :current_profile

  def current_profile
    @current_profile ||= current_user.profile
    @current_profile
  end

  protected

  def layout_by_resource
    if devise_controller?
      "devise"
    else
      "application"
    end
  end
end
