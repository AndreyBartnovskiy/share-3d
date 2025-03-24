class CreateModels < ActiveRecord::Migration[8.0]
  def change
    create_table :models do |t|
      t.string :name
      t.text :description
      t.string :file
      t.references :user, null: false, foreign_key: true
      t.string :tags

      t.timestamps
    end
  end
end
