Rails.application.routes.draw do
  # get "users/index"
  # get "users/show"
  # get "users/new"
  # get "users/create"
  # get "users/edit"
  # get "users/update"

  devise_for :users, controllers: { registrations: "registrations" }
  resource :profiles

  get "user/me", to: "users#me", as: "my_settings"
  patch "user/update_me", to: "users#update_me", as: "update_my_settings"
  get "user/password", to: "users#password", as: "my_password"
  patch "user/update_password", to: "users#update_password", as: "my_update_password"

  scope "profile", as: "profile" do
    resources :users
  end

  get "activity/mine"
  get "activity/feed"

  get "up" => "rails/health#show", as: :rails_health_check
  root to: "activity#mine"
end
