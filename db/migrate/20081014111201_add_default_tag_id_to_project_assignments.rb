class AddDefaultTagIdToProjectAssignments < ActiveRecord::Migration
  def self.up
    add_column :project_assignments, :default_tag_id, :integer
  end

  def self.down
    remove_column :project_assignments, :default_tag_id
  end
end
