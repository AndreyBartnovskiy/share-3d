Rails.application.routes.draw do
  if Rails.env.development?
    mount LetterOpenerWeb::Engine, at: "/letter_opener"
  end

  # get "users/index"
  # get "users/show"
  # get "users/new"
  # get "users/create"
  # get "users/edit"
  # get "users/update"

  devise_for :users, controllers: { registrations: "registrations" }

  # Маршруты для личного профиля
  scope :profile, as: :profile do
    get "/", to: "users#profile", as: "root" # Главная страница профиля
    get "settings", to: "users#me", as: "settings" # Настройки профиля
    patch "settings", to: "users#update_me", as: "update_settings"
    get "password", to: "users#password", as: "password" # Изменение пароля
    patch "password", to: "users#update_password", as: "update_password"

    # Маршруты для управления пользователями (только для админов)
    resources :users
  end

  scope "profile", as: "profile" do
    resources :users
  end

  # Общие маршруты для пользователей и моделей
  resources :users, only: [ :index, :show ] do
    resources :models
  end

  # Маршруты для моделей
  resources :models, only: [] do
    member do
      get :embed
      post :optimize
    end
  end

  # Маршруты для активности
  get "activity/mine"
  get "activity/feed"

  get "up" => "rails/health#show", as: :rails_health_check
  root to: "activity#mine"
end
