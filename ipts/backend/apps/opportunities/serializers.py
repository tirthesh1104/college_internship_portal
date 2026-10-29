from rest_framework import serializers
from django.utils import timezone
from apps.opportunities.models import Opportunity
from apps.students.models import Department

class OpportunitySerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(source='created_by.name', read_only=True)
    creator_role = serializers.CharField(source='created_by.role', read_only=True)
    target_department_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Department.objects.all(), 
        source='target_departments', 
        required=False
    )
    target_department_codes = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = [
            'id', 'title', 'organization', 'country', 'opportunity_type', 'description',
            'learning_outcomes', 'eligibility_requirements', 'required_skills',
            'start_date', 'end_date', 'duration', 'stipend_type', 'stipend_amount',
            'mode', 'available_seats', 'deadline', 'application_type', 'application_url',
            'external_warning_note', 'created_by', 'creator_name', 'creator_role',
            'status', 'rejection_reason', 'target_departments', 'target_department_ids',
            'target_department_codes', 'target_academic_year', 'published_at',
            'is_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'published_at', 'created_at', 'updated_at']

    def get_target_department_codes(self, obj):
        return [d.code for d in obj.target_departments.all()]

    def get_is_expired(self, obj):
        return obj.deadline < timezone.now().date()

    def validate_application_url(self, value):
        if value:
            value = value.strip()
            if not (value.startswith('http://') or value.startswith('https://')):
                raise serializers.ValidationError("Application URL must begin with http:// or https://")
        return value

    def validate(self, data):
        # Duplicate detection check
        title = data.get('title')
        org = data.get('organization')
        url = data.get('application_url')
        instance_id = self.instance.id if self.instance else None

        if title and org:
            duplicate = Opportunity.objects.filter(
                title__iexact=title.strip(),
                organization__iexact=org.strip()
            ).exclude(id=instance_id)

            if url:
                duplicate = duplicate.filter(application_url__iexact=url.strip())
            
            if duplicate.exists():
                raise serializers.ValidationError({
                    'title': f"A potential duplicate opportunity '{title}' at '{org}' already exists."
                })

        return data
