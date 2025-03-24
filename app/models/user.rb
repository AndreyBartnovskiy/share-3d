class User < ApplicationRecord
  rolify
  attr_accessor :role

  belongs_to :profile, optional: true
  has_many :models, dependent: :destroy

  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :invitable, :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
end
