class EnableExtensionForUuid < ActiveRecord::Migration[8.0]
  def change
    enable_extension "pgcrypto" unless extension_enabled?('pgcripto')
  end
end
