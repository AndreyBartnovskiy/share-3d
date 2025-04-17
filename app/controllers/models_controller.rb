class ModelsController < ApplicationController
  before_action :set_user, only: [ :index, :new, :create, :show ]
  before_action :set_models, only: [ :index ]
  before_action :authenticate_user!

  def index
    if current_user.has_role?(:admin)
      @models = Model.all
    else
      @models = current_user.models
    end
  end

  def new
    @model = @user.models.new
  end

  def create
    @model = @user.models.new(model_params)

    if @model.save
      redirect_to user_model_path(@user, @model), notice: "Модель успешно загружена!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @model = @user.models.find(params[:id])

    if @model.nil?
      redirect_to user_models_path(@user), alert: "Модель не найдена!"
      return
    end

    # Анализ UV-развёртки
    begin
      @uv_analysis = UvUnwrapAnalyzer.analyze(@model)
    rescue => e
      @uv_analysis = { error: "Ошибка анализа UV: #{e.message}" }
    end
  end

  def edit
    @model = Model.find(params[:id])
    unless current_user.has_role?(:admin) || @model.user == current_user
      redirect_to user_models_path(current_user), alert: "У вас нет прав для редактирования этой модели"
    end
  end

  def update
    @model = Model.find(params[:id])
    unless current_user.has_role?(:admin) || @model.user == current_user
      redirect_to user_models_path(current_user), alert: "У вас нет прав для редактирования этой модели"
      return
    end

    if @model.update(model_params)
      redirect_to user_model_path(@model.user, @model), notice: "Модель успешно обновлена!"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @model = Model.find(params[:id])
    unless current_user.has_role?(:admin) || @model.user == current_user
      redirect_to user_models_path(current_user), alert: "У вас нет прав для удаления этой модели"
      return
    end

    @model.destroy
    redirect_to user_models_path(current_user), notice: "Модель успешно удалена!"
  end

  def embed
    @model = Model.find(params[:id])
  end

  private

  def set_user
    @user = current_user
  end

  def set_models
    if current_user.has_role?(:admin)
      @models = Model.all
    else
      @models = current_user.models
    end
  end

  def model_params
    params.require(:model).permit(:name, :description, :file, :tags)
  end
end
