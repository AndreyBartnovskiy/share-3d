class ModelsController < ApplicationController
  before_action :authenticate_user!

  def new
    @user = current_user
    @model = @user.models.new
  end

  def create
    @user = current_user
    @model = @user.models.new(model_params)

    if @model.save
      redirect_to user_model_path(@user, @model), notice: "Модель успешно загружена!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    # if current_user.admin?
      # @user = User.find(params[:user_id])  # Для администратора можно найти модель другого пользователя
    # else
    @user = current_user
    # end
    @model = @user.models.find(params[:id])

    # можно закомментить
    if @model.nil?
      redirect_to user_models_path(@user), alert: "Модель не найдена!"
    end
  end
  # Если ты планируешь, чтобы администратор мог просматривать модели других пользователей, то вместо @user = current_user ты должен добавить проверку роли администратора.

  private

  def model_params
    params.require(:model).permit(:name, :description, :file, :tags)
  end
end
