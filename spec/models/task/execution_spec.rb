require File.expand_path(File.dirname(__FILE__) + '/../../spec_helper')
require File.expand_path(File.dirname(__FILE__) + '/../shared/task_spec.rb')

describe Task::Execution do
  def get_instance
    Task::Execution.new(Execution.make, User.make)
  end
  it_should_behave_like "task"
end
