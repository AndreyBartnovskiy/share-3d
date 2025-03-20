class AddNameToProfiles < ActiveRecord::Migration[8.0]
  def change
    add_column :profiles, :name, :string
  end
end
