# frozen_string_literal: true

require 'open3'
require 'json'
require 'stringio'

class MeshOptimizer
  PYTHON_SCRIPT = Rails.root.join('lib', 'mesh_optimization', 'optimize_mesh.py').to_s

  # model: ActiveStorage::Attached, simplify_ratio: Float (0 < x < 1)
  # Возвращает хэш: { success: true, output_path: ..., original_faces: ..., optimized_faces: ... } или { error: ... }
  def self.optimize(model, simplify_ratio = 0.5)
    return { error: 'Файл не прикреплён' } unless model.file.attached?

    extension = File.extname(model.file.filename.to_s).downcase
    unless %w[.obj .glb .stl].include?(extension)
      return { error: 'Формат не поддерживается для оптимизации.' }
    end

    result = nil
    model.file.blob.open do |input_file|
      # Временный файл для результата
      Dir.mktmpdir do |dir|
        output_path = File.join(dir, "optimized#{extension}")
        env = { 'DYLD_LIBRARY_PATH' => '/opt/homebrew/lib' } # для macOS, если нужен assimp
        stdout, stderr, status = Open3.capture3(env, 'python3', PYTHON_SCRIPT, input_file.path, output_path, simplify_ratio.to_s)
        # binding.pry

        if status.success?
          begin
            result = JSON.parse(stdout)
            # Считываем оптимизированный файл в память (StringIO)
            if result['output_path'] && File.exist?(result['output_path'])
              buffer = StringIO.new(File.binread(result['output_path']))
              # Определяем имя файла для возврата
              optimized_filename = result['saved_as_obj'] ? "optimized_#{model.file.filename.base}.obj" : "optimized_#{model.file.filename}"
              result['optimized_buffer'] = buffer
              result['optimized_filename'] = optimized_filename
            end
            result['saved_as_obj'] = result['saved_as_obj']
          rescue JSON::ParserError
            result = { error: 'Ошибка парсинга результата оптимизации.' }
          end
        else
          result = { error: "Ошибка оптимизации: #{stderr.presence || stdout}" }
        end
      end
    end
    result
  end
end
