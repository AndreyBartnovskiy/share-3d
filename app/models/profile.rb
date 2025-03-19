class Profile < ApplicationRecord
  has_many :users
  resourcify
end
