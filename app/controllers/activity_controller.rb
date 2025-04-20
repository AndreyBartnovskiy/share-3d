class ActivityController < ApplicationController
  def mine
    # Даем доступ всем авторизованным пользователям без исключения
    # Для новых пользователей это будет базовая страница
    render :mine
  end

  def feed
    begin
      authorize! :read, :activity
    rescue CanCan::AccessDenied
      redirect_to activity_mine_path, alert: "У вас нет прав для просмотра общей активности"
    end
  end
end
