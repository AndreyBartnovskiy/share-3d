# frozen_string_literal: true

require 'open3'
require 'json'

class UvUnwrapAnalyzer
  # Анализирует UV-развёртку для модели
  # Возвращает хэш с результатами анализа
  # model_file_path — путь к временному файлу модели
  PYTHON_SCRIPT = Rails.root.join('lib', 'uv_analysis', 'analyze_uv.py').to_s

  def self.analyze(model)
    return { error: 'Файл не прикреплён' } unless model.file.attached?

    extension = File.extname(model.file.filename.to_s).downcase
    if extension == '.stl'
      return {
        uv_exists: false,
        reason: 'Формат STL не поддерживает UV-развёртку.'
      }
    end

    result = nil
    model.file.blob.open do |file|
      # Явно указываем путь к библиотеке assimp для macOS
      env = { 'DYLD_LIBRARY_PATH' => '/opt/homebrew/lib' }
      stdout, stderr, status = Open3.capture3(env, 'python3', PYTHON_SCRIPT, file.path)

      if status.success?
        begin
          result = JSON.parse(stdout)
        rescue JSON::ParserError
          result = { error: 'Ошибка парсинга результата анализа UV.' }
        end
      else
        result = { error: "Ошибка анализа UV: #{stderr}" }
      end
    end
    result
  end
end
