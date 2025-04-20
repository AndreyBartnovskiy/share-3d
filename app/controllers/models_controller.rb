class ModelsController < ApplicationController
  before_action :set_user, only: [ :index, :new, :create ]
  before_action :set_model, only: [ :show, :edit, :update, :destroy, :embed, :optimize ]
  before_action :authenticate_user!
  load_and_authorize_resource except: [:index, :new, :create]
  skip_authorize_resource only: [:index]

  def index
    @user = User.find(params[:user_id]) if params[:user_id]
    @user ||= current_user
    
    if @user != current_user && !current_user.has_role?(:admin, current_user.profile)
      redirect_to user_models_path(current_user), alert: "У вас нет прав для просмотра моделей других пользователей"
      return
    end
    
    if current_user.has_role?(:admin, current_user.profile) && @user == current_user
      # Администратор смотрит все модели пользователей своего профиля
      @models = Model.joins(user: :profile).where(users: { profile_id: current_user.profile_id })
    else
      # Пользователь смотрит свои модели или админ смотрит модели конкретного пользователя
      @models = @user.models
    end
  end

  def new
    @model = @user.models.new
    authorize! :create, @model
  end

  def create
    @model = @user.models.new(model_params)
    authorize! :create, @model

    if @model.save
      redirect_to user_model_path(@user, @model), notice: "Модель успешно загружена!"
    else
      render :new, status: :unprocessable_entity
    end
  end

  def show
    @user = @model.user
    authorize! :read, @model
    
    # Анализ UV-развёртки
    begin
      @uv_analysis = UvUnwrapAnalyzer.analyze(@model)
    rescue => e
      @uv_analysis = { error: "Ошибка анализа UV: #{e.message}" }
    end
  end

  def edit
    @user = @model.user
    authorize! :update, @model
  end

  def update
    @user = @model.user
    authorize! :update, @model
    
    if @model.update(model_params)
      redirect_to user_model_path(@user, @model), notice: "Модель успешно обновлена!"
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @user = @model.user
    authorize! :destroy, @model
    
    @model.destroy
    redirect_to user_models_path(@user), notice: "Модель успешно удалена!"
  end

  def embed
    @user = @model.user
    authorize! :read, @model
  end

  def optimize
    @user = @model.user
    authorize! :update, @model
    
    simplify_ratio = params[:simplify_ratio].presence || 0.5
    result = MeshOptimizer.optimize(@model, simplify_ratio.to_f)

    if result['success'] && result['optimized_buffer'].present? && result['optimized_filename'].present?
      @model.optimized_file.attach(io: result['optimized_buffer'], filename: result['optimized_filename'])
      @model.save!
      msg = "Модель успешно оптимизирована! Полигонов: #{result['original_faces']} → #{result['optimized_faces']}"
      msg += "<br>Оптимизированная версия сохранена в формате .obj, так как исходный .glb не поддерживается для сохранения." if result['saved_as_obj']
      redirect_to user_model_path(@user, @model), notice: msg.html_safe
    else
      error_msg = result['error'] || 'Неизвестная ошибка оптимизации.'
      redirect_to user_model_path(@user, @model), alert: "Ошибка оптимизации: #{error_msg}"
    end
  end

  private

  def set_user
    @user = current_user
  end

  def set_model
    @model = Model.find(params[:id])
  end

  def model_params
    params.require(:model).permit(:name, :description, :file, :tags)
  end
end
