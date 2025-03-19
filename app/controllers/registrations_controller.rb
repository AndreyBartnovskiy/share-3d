class RegistrationsController < Devise::RegistrationsController
  before_action :configure_permitted_parameters

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name]) # rubocop:disable Layout/SpaceInsideArrayLiteralBrackets
  end

  def after_sign_up_path_for(resource)
    new_profiles_path
  end
end
