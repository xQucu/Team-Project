from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.me, name='me'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('workouts/', views.workouts, name='workouts'),
    path('workouts/modify/', views.modify_workout, name='modify_workout'),
    path('workout-data/save/', views.save_workout_data, name='save_workout_data'),
    path('workout-data/finish/', views.finish_workout, name='finish_workout'),
    path('workout-data/<int:workout_id>/', views.get_workout_data, name='get_workout_data'),
    path('chat/', views.chat, name='chat'),
    path('onboarding/chat/', views.onboarding_chat, name='onboarding_chat'),
]