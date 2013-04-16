/*************************************************************************
 * Copyright 2009-2013 Eucalyptus Systems, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see http://www.gnu.org/licenses/.
 *
 * Please contact Eucalyptus Systems, Inc., 6755 Hollister Ave., Goleta
 * CA 93117, USA or visit http://www.eucalyptus.com/licenses/ if you need
 * additional information or have any questions.
 ************************************************************************/
package com.eucalyptus.autoscaling.instances;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.log4j.Logger;
import org.hibernate.criterion.Criterion;
import org.hibernate.criterion.Property;
import org.hibernate.criterion.Restrictions;
import com.eucalyptus.autoscaling.groups.AutoScalingGroup;
import com.eucalyptus.autoscaling.metadata.AbstractOwnedPersistents;
import com.eucalyptus.autoscaling.metadata.AutoScalingMetadataException;
import com.eucalyptus.autoscaling.metadata.AutoScalingMetadataNotFoundException;
import com.eucalyptus.util.Callback;
import com.eucalyptus.util.CollectionUtils;
import com.eucalyptus.util.OwnerFullName;
import com.google.common.base.Predicate;
import com.google.common.base.Predicates;
import com.google.common.collect.Iterables;
import com.google.common.collect.Maps;
import com.google.common.collect.Sets;

/**
 *
 */
public class PersistenceAutoScalingInstances extends AutoScalingInstances {

  private final Logger logger = Logger.getLogger( PersistenceAutoScalingInstances.class ) ;

  private PersistenceSupport persistenceSupport = new PersistenceSupport();

  @Override
  public List<AutoScalingInstance> list( final OwnerFullName ownerFullName ) throws AutoScalingMetadataException {
    return persistenceSupport.list( ownerFullName );
  }

  @Override
  public List<AutoScalingInstance> list( final OwnerFullName ownerFullName, 
                                         final Predicate<? super AutoScalingInstance> filter ) throws AutoScalingMetadataException {
    return persistenceSupport.list( ownerFullName, filter );
  }

  @Override
  public List<AutoScalingInstance> listByGroup( final OwnerFullName ownerFullName,
                                                final String groupName ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = AutoScalingInstance.withOwner( ownerFullName );
    example.setAutoScalingGroupName( groupName );
    return persistenceSupport.listByExample( example, Predicates.alwaysTrue() );
  }

  @Override
  public List<AutoScalingInstance> listByGroup( final AutoScalingGroup group ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = exampleForGroup( group );
    return persistenceSupport.listByExample( example, Predicates.alwaysTrue() );
  }

  @Override
  public List<AutoScalingInstance> listByState( final LifecycleState lifecycleState,
                                                final ConfigurationState configurationState ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = AutoScalingInstance.withStates( lifecycleState, configurationState );
    return persistenceSupport.listByExample( example, Predicates.and( lifecycleState, configurationState ) );
  }

  @Override
  public List<AutoScalingInstance> listUnhealthyByGroup( final AutoScalingGroup group ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = exampleForGroup( group );
    example.setHealthStatus( HealthStatus.Unhealthy );
    return persistenceSupport.listByExample( example, Predicates.alwaysTrue() );
  }

  @Override
  public AutoScalingInstance lookup( final OwnerFullName ownerFullName, 
                                     final String instanceId ) throws AutoScalingMetadataException {
    return persistenceSupport.lookupByExample(
        persistenceSupport.exampleWithName( ownerFullName, instanceId ),
        ownerFullName,
        instanceId );
  }

  @Override
  public AutoScalingInstance update( final OwnerFullName ownerFullName, 
                                     final String instanceId, 
                                     final Callback<AutoScalingInstance> instanceUpdateCallback ) throws AutoScalingMetadataException {
    return persistenceSupport.updateByExample(
        persistenceSupport.exampleWithName( ownerFullName, instanceId ),
        ownerFullName,
        instanceId,
        instanceUpdateCallback );
  }

  @Override
  public void markMissingInstancesUnhealthy( final AutoScalingGroup group,
                                             final Collection<String> instanceIds ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = exampleForGroup( group );
    example.setHealthStatus( HealthStatus.Healthy );

    final List<AutoScalingInstance> instancesToMark = persistenceSupport.listByExample(
        example,
        LifecycleState.InService,
        instanceIds.isEmpty() ?
            Restrictions.conjunction() :
            Restrictions.not( Property.forName( "displayName" ).in( instanceIds ) ),
        Collections.<String,String>emptyMap() );

    for ( final AutoScalingInstance instance : instancesToMark ) {
      try {
        persistenceSupport.updateByExample(
            AutoScalingInstance.withUuid( instance.getNaturalId() ),
            group.getOwner(),
            instance.getInstanceId(),
            new Callback<AutoScalingInstance>(){
              @Override
              public void fire( final AutoScalingInstance instance ) {
                if ( instance.healthStatusGracePeriodExpired() ) {
                  logger.info( "Marking instance unhealthy: " + instance.getInstanceId() );
                  instance.setHealthStatus( HealthStatus.Unhealthy );
                } else {
                  logger.debug( "Instance not healthy but within grace period: " + instance.getInstanceId() );
                }
              }
            });
      } catch ( final AutoScalingMetadataNotFoundException e ) {
        // removed, no need to mark unhealthy
      }
    }
  }

  @Override
  public void markExpiredPendingUnhealthy( final AutoScalingGroup group,
                                           final Collection<String> instanceIds,
                                           final long maxAge ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = exampleForGroup( group );
    example.setHealthStatus( HealthStatus.Healthy );

    final List<AutoScalingInstance> instancesToMark = instanceIds.isEmpty() ?
        Collections.<AutoScalingInstance>emptyList() :
        persistenceSupport.listByExample(
          example,
          LifecycleState.Pending,
          Property.forName( "displayName" ).in( instanceIds ),
          Collections.<String,String>emptyMap() );

    for ( final AutoScalingInstance instance : instancesToMark ) {
      try {
        persistenceSupport.updateByExample(
            AutoScalingInstance.withUuid( instance.getNaturalId() ),
            group.getOwner(),
            instance.getInstanceId(),
            new Callback<AutoScalingInstance>(){
              @Override
              public void fire( final AutoScalingInstance instance ) {
                if ( instance.getCreationTimestamp().getTime() < maxAge ) {
                  logger.info( "Marking pending instance unhealthy: " + instance.getInstanceId() );
                  instance.setHealthStatus( HealthStatus.Unhealthy );
                }
              }
            });
      } catch ( final AutoScalingMetadataNotFoundException e ) {
        // removed, no need to mark unhealthy
      }
    }
  }

  @Override
  public Set<String> verifyInstanceIds( final String accountNumber,
                                        final Collection<String> instanceIds ) throws AutoScalingMetadataException {
    final Set<String> verifiedInstanceIds = Sets.newHashSet();

    if ( !instanceIds.isEmpty() ) {
      final AutoScalingInstance example = AutoScalingInstance.withOwner( accountNumber );
      final Criterion idCriterion = Property.forName( "displayName" ).in( instanceIds );

      Iterables.addAll(
          verifiedInstanceIds,
          Iterables.transform(
              persistenceSupport.listByExample(
                  example, Predicates.alwaysTrue(), idCriterion, Collections.<String,String>emptyMap() ),
              AutoScalingInstances.instanceId() ) );
    }

    return verifiedInstanceIds;
  }

  @Override
  public void transitionState( final AutoScalingGroup group,
                               final LifecycleState from,
                               final LifecycleState to,
                               final Collection<String> instanceIds ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = exampleForGroup( group );
    example.setLifecycleState( from );
    updateInstances( example, from, from.transitionTo( to ), instanceIds );
  }

  @Override
  public void transitionConfigurationState( final AutoScalingGroup group,
                                            final ConfigurationState from,
                                            final ConfigurationState to,
                                            final Collection<String> instanceIds ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = exampleForGroup( group );
    example.setConfigurationState( from );
    updateInstances( example, from, from.transitionTo( to ), instanceIds );
  }

  @Override
  public int registrationFailure( final AutoScalingGroup group,
                                  final Collection<String> instanceIds ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = exampleForGroup( group );
    final Map<String,Integer> failureCountMap = Maps.newHashMap();
    updateInstances( example, Predicates.alwaysTrue(), new Predicate<AutoScalingInstance>() {
      @Override
      public boolean apply( final AutoScalingInstance instance ) {
        failureCountMap.put( instance.getInstanceId(), instance.incrementRegistrationAttempts() );
        return true;
      }
    }, instanceIds );
    return CollectionUtils.reduce( failureCountMap.values(), Integer.MAX_VALUE, CollectionUtils.min() );
  }

  @Override
  public boolean delete( final AutoScalingInstance autoScalingInstance ) throws AutoScalingMetadataException {
    return persistenceSupport.delete( autoScalingInstance );
  }

  @Override
  public boolean deleteByGroup( final AutoScalingGroup group ) throws AutoScalingMetadataException {
    final AutoScalingInstance example = exampleForGroup( group );
    return !persistenceSupport.deleteByExample( example ).isEmpty();
  }

  @Override
  public AutoScalingInstance save( final AutoScalingInstance autoScalingInstance ) throws AutoScalingMetadataException {
    return persistenceSupport.save( autoScalingInstance );
  }

  private AutoScalingInstance exampleForGroup( final AutoScalingGroup group ) {
    final AutoScalingInstance example = AutoScalingInstance.withOwner( group.getOwner() );
    example.clearUserIdentity();
    example.setAutoScalingGroupName( group.getAutoScalingGroupName() );
    return example;
  }

  private void updateInstances( final AutoScalingInstance fromExample,
                                final Predicate<? super AutoScalingInstance> fromPredicate,
                                final Predicate<? super AutoScalingInstance> updatePredicate,
                                final Collection<String> instanceIds ) throws AutoScalingMetadataException {
    final AbstractOwnedPersistents.WorkCallback<Void> updateCallback = new AbstractOwnedPersistents.WorkCallback<Void>() {
      @Override
      public Void doWork() throws AutoScalingMetadataException {
        final List<AutoScalingInstance> instances = persistenceSupport.listByExample(
            fromExample,
            fromPredicate,
            Property.forName( "displayName" ).in( instanceIds ),
            Collections.<String, String>emptyMap() );
        CollectionUtils.each(
            instances,
            updatePredicate
        );
        return null;
      }
    };

    persistenceSupport.transactionWithRetry( AutoScalingInstance.class, updateCallback );
  }

  private static class PersistenceSupport extends AbstractOwnedPersistents<AutoScalingInstance> {
    private PersistenceSupport() {
      super( "auto scaling instance" );
    }

    @Override
    protected AutoScalingInstance exampleWithUuid( final String uuid ) {
      return AutoScalingInstance.withUuid( uuid );
    }

    @Override
    protected AutoScalingInstance exampleWithOwner( final OwnerFullName ownerFullName ) {
      return AutoScalingInstance.withOwner( ownerFullName );
    }

    @Override
    protected AutoScalingInstance exampleWithName( final OwnerFullName ownerFullName, final String name ) {
      return AutoScalingInstance.named( ownerFullName, name );
    }
  }
}