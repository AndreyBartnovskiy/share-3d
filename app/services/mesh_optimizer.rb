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
        # Используем Open3D для оптимизации
        # ВАЖНО: использовать python из venv, где установлен open3d
        python_exec = ENV['OPEN3D_PYTHON'] || 'python3'
        python_script_path = Rails.root.join('lib', 'mesh_optimization', 'optimize_mesh.py').to_s
        python_cmd = [
          python_exec, python_script_path, input_file.path, output_path, simplify_ratio.to_s
        ]
        stdout, stderr, status = Open3.capture3(env, *python_cmd)
        binding.pry

        # Если скрипт завершился с ошибкой или stdout пустой — показать ошибку с деталями
        if !status.success? || stdout.blank?
          result = {
            error: 'Ошибка оптимизации: скрипт завершился с ошибкой или не вернул результат.',
            exit_code: status.exitstatus,
            stdout: stdout,
            stderr: stderr
          }
        else
          # Open3D может писать предупреждения в stdout до JSON — ищем JSON-результат в конце
          json_match = stdout.match(/\{.*\}\s*$/m)
          if json_match
            begin
              result = JSON.parse(json_match[0])
              if result['success'] && result['output_path'] && File.exist?(result['output_path'])
                buffer = StringIO.new(File.binread(result['output_path']))
                optimized_filename = "optimized_#{model.file.filename.base}#{extension}"
                result['optimized_buffer'] = buffer
                result['optimized_filename'] = optimized_filename
              end
            rescue JSON::ParserError
              result = { error: 'Ошибка парсинга результата оптимизации.', raw: stdout }
            end
          else
            result = { error: 'Ошибка оптимизации: не найден JSON-результат в выводе.', raw: stdout }
          end
        end
      end
    end
    result
  end
end
