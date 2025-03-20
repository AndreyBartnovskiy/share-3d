class ApplicationController < ActionController::Base
  allow_browser versions: :modern

  protect_from_forgery with: :exception
  before_action :authenticate_user!
  layout :layout_by_resource

  helper_method :current_profile

  def current_profile
    @current_profile ||= current_user.profile
    @current_profile
  end

  rescue_from CanCan::AccessDenied do |exception|
    redirect_to root_url, error: exception.message
  end
  add_flash_types :error

  protected

  def layout_by_resource
    if devise_controller?
      "devise"
    else
      "application"
    end
  end
end
