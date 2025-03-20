class ProfilesController < ApplicationController
  def new
    redirect_to root_path unless current_user.profile.nil?

    @profile = Profile.new
  end

  def create
    @profile = Profile.new(profile_params)

    if @profile.save
      current_user.profile = @profile
      current_user.add_role :admin, @profile

      current_user.save
      redirect_to root_path, success: "Your profile has been created!"
    else
      render :new
    end
  end

  private

  def profile_params
    params.require(:profile).permit(:name)
  end
end
