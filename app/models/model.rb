class Model < ApplicationRecord
  belongs_to :user
  has_one_attached :file # Привязываем 3D-модель к Active Storage

  validates :name, presence: true
  validates :file, presence: true
end
