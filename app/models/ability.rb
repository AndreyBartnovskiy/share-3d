class Ability
  include CanCan::Ability

  def initialize(user)
    # Гость (не аутентифицированный пользователь)
    return unless user.present?

    # Базовые права для всех авторизованных пользователей, независимо от наличия профиля
    can :read, User, id: user.id
    can :update, User, id: user.id
    can :update_password, User, id: user.id
    can :read, :mine_activity
    can :manage, Model, user_id: user.id

    # Определяем профиль пользователя
    profile = user.profile
    
    # Если у пользователя нет профиля, разрешаем только создание профиля
    # и просмотр необходимых страниц
    if profile.nil?
      can :create, Profile
      return
    end

    # Администратор профиля (группы)
    if user.has_role?(:admin, profile)
      # Администраторы могут управлять всем в своем профиле
      can :manage, Profile, id: profile.id
      can :manage, User, profile_id: profile.id
      can :read, Model, user: { profile_id: profile.id }
      can :read, :activity # Активность всех пользователей в их профиле

      # Дополнительные права администратора
      can :invite, User # Право приглашать пользователей
      can :create, Profile # Право создавать профили/группы

    # Обычный пользователь группы
    elsif user.has_role?(:user, profile)
      # Просмотр своего профиля
      can :read, Profile, id: profile.id

      # Просмотр других пользователей в своей группе
      can :read, User, profile_id: profile.id
    end
  end
end
