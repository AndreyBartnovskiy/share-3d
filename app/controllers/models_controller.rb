class ModelsController < ApplicationController
  before_action :set_user, only: [ :index, :new, :create, :show ]
  before_action :set_models, only: [ :index ]
  before_action :authenticate_user!

  def index
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
    end
  end

  def embed
    @model = Model.find(params[:id])
  end

  private

  def set_user
    @user = current_user
  end

  def set_models
    @models = current_user.models
  end

  def model_params
    params.require(:model).permit(:name, :description, :file, :tags)
  end
end
