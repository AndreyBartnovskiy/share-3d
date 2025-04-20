class RegistrationsController < Devise::RegistrationsController
  before_action :configure_permitted_parameters

  # После регистрации назначаем роль и создаем профиль для преподавателя
  def create
    super do |resource|
      next unless resource.persisted?
      if params[:account_type] == 'teacher'
        # создаем профиль группы и даем локальную роль admin
        profile = Profile.create(name: "Profile for #{resource.email}")
        resource.profile = profile
        resource.add_role :admin, profile
      else
        # даем глобальную роль user
        resource.add_role :user
      end
      resource.save
    end
  end

  protected

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:name])
  end

  def after_sign_up_path_for(resource)
    root_path
  end
end
