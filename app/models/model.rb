class Model < ApplicationRecord
  belongs_to :user
  has_one_attached :file # Привязываем 3D-модель к Active Storage
  has_one_attached :optimized_file # Оптимизированная версия модели

  validates :name, presence: true
  validates :file, presence: true

  # Валидация формата файла
  validate :correct_file_format

  private

  def correct_file_format
    return if file.blank?

    # Расширения, которые разрешаем для 3D моделей
    allowed_extensions = [ ".glb", ".obj", ".stl" ]

    # Получаем расширение файла
    extension = File.extname(file.filename.to_s).downcase

    # Проверяем, что расширение файла разрешено
    unless allowed_extensions.include?(extension)
      errors.add(:file, "должен быть в одном из форматов: .glb, .obj, .stl")
    end
  end
end
