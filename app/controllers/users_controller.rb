class UsersController < ApplicationController
  before_action :set_user, only: [ :show, :edit, :update, :destroy ]
  before_action :authenticate_user!
  load_and_authorize_resource except: [:me, :password, :update_password, :update_me, :profile, :index]

  def index
    if current_user.profile.nil?
      redirect_to root_path, alert: "Для получения доступа к пользователям необходимо создать или присоединиться к профилю"
      return
    end
    
    if current_user.has_role?(:admin, current_user.profile)
      # Администратор видит всех пользователей своего профиля
      @users = User.where(profile: current_user.profile)
    else
      # Обычный пользователь видит только пользователей своего профиля, если он входит в группу
      if current_user.has_role?(:user, current_user.profile)
        @users = User.where(profile: current_user.profile)
      else
        redirect_to root_path, alert: "У вас нет доступа к списку пользователей"
        return
      end
    end
    
    authorize! :read, User
  end

  def show
  end

  def new
    @user = User.new
    set_choices
  end

  def edit
    set_choices
  end

  def me
    @user = current_user
    authorize! :update, @user
  end

  def password
    @user = current_user
    authorize! :update_password, @user
  end

  def update_password
    @user = current_user
    authorize! :update_password, @user

    respond_to do |format|
      if @user.update(user_password_params)
        bypass_sign_in(@user)

        format.html { redirect_to profile_password_path, notice: "Пароль успешно обновлен." }
      else
        format.html { render :password }
      end
    end
  end

  def update_me
    @user = current_user
    authorize! :update, @user

    respond_to do |format|
      if @user.update(user_params)
        format.html { redirect_to profile_settings_path, notice: "Ваши данные успешно обновлены." }
      else
        format.html { render :me }
      end
    end
  end

  def create
    @user = User.unscoped.new(user_params.except("role"))
    @user.profile = current_profile
    @user.password = "password123"

    authorize! :invite, @user

    respond_to do |format|
      begin
        if @user.valid? && @user.invite!(current_user)
          @user.add_role user_params[:role].to_sym, current_profile

          format.html { redirect_to profile_users_path, notice: "Пользователь успешно приглашен." }
        else
          set_choices
          format.html { render :new }
        end
      rescue ActiveRecord::RecordNotUnique
        flash[:alert] = "Email должен быть уникальным"
        format.html { render :new }
      end
    end
  end

  def update
    respond_to do |format|
      if @user.update(user_params.except("role"))
        update_roles

        format.html { redirect_to profile_users_path, notice: "Пользователь успешно обновлен." }
      else
        set_choices
        format.html { render :edit }
      end
    end
  end

  def destroy
    @user.destroy

    respond_to do |format|
      format.html { redirect_to profile_users_path, notice: "Пользователь успешно удален." }
      format.json { head :no_content }
    end
  end

  def profile
    @user = current_user
    authorize! :read, @user
  end

  private

  def set_user
    @user = User.find(params[:id])
  end

  def set_choices
    @choices = [ [ "Админ", "admin" ], [ "Пользователь", "user" ] ]
  end

  def user_params
    params.require(:user).permit(:name, :email, :role)
  end

  def user_password_params
    params.require(:user).permit(:password, :password_confirmation)
  end

  def update_roles
    if @user.roles&.first&.name != user_params[:role]
      @user.remove_role @user.roles&.first&.name.to_sym, current_profile if @user.roles&.first&.name
      @user.add_role user_params[:role].to_sym, current_profile
    end
  end

  def current_profile
    @current_profile ||= current_user.profile
  end
end
